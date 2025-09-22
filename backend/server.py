from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import requests
import base64

# AI agents
from ai_agents.agents import AgentConfig, SearchAgent, ChatAgent


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# AI agents init
agent_config = AgentConfig()
search_agent: Optional[SearchAgent] = None
chat_agent: Optional[ChatAgent] = None

# Main app
app = FastAPI(title="AI Agents API", description="Minimal AI Agents API with LangGraph and MCP support")

# API router
api_router = APIRouter(prefix="/api")


# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str


# AI agent models
class ChatRequest(BaseModel):
    message: str
    agent_type: str = "chat"  # "chat" or "search"
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    success: bool
    response: str
    agent_type: str
    capabilities: List[str]
    metadata: dict = Field(default_factory=dict)
    error: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    max_results: int = 5


class SearchResponse(BaseModel):
    success: bool
    query: str
    summary: str
    search_results: Optional[dict] = None
    sources_count: int
    error: Optional[str] = None


# Wallpaper models
class WallpaperRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "9:16"  # Phone wallpaper ratio
    megapixels: str = "1"
    style: Optional[str] = None

class WallpaperResponse(BaseModel):
    success: bool
    id: str
    prompt: str
    image_url: Optional[str] = None
    preview_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    error: Optional[str] = None

class Wallpaper(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    aspect_ratio: str
    image_url: str
    image_data: str  # Base64 encoded image
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# AI agent routes
@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    # Chat with AI agent
    global search_agent, chat_agent
    
    try:
        # Init agents if needed
        if request.agent_type == "search" and search_agent is None:
            search_agent = SearchAgent(agent_config)
            
        elif request.agent_type == "chat" and chat_agent is None:
            chat_agent = ChatAgent(agent_config)
        
        # Select agent
        agent = search_agent if request.agent_type == "search" else chat_agent
        
        if agent is None:
            raise HTTPException(status_code=500, detail="Failed to initialize agent")
        
        # Execute agent
        response = await agent.execute(request.message)
        
        return ChatResponse(
            success=response.success,
            response=response.content,
            agent_type=request.agent_type,
            capabilities=agent.get_capabilities(),
            metadata=response.metadata,
            error=response.error
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ChatResponse(
            success=False,
            response="",
            agent_type=request.agent_type,
            capabilities=[],
            error=str(e)
        )


@api_router.post("/search", response_model=SearchResponse)
async def search_and_summarize(request: SearchRequest):
    # Web search with AI summary
    global search_agent
    
    try:
        # Init search agent if needed
        if search_agent is None:
            search_agent = SearchAgent(agent_config)
        
        # Search with agent
        search_prompt = f"Search for information about: {request.query}. Provide a comprehensive summary with key findings."
        result = await search_agent.execute(search_prompt, use_tools=True)
        
        if result.success:
            return SearchResponse(
                success=True,
                query=request.query,
                summary=result.content,
                search_results=result.metadata,
                sources_count=result.metadata.get("tools_used", 0)
            )
        else:
            return SearchResponse(
                success=False,
                query=request.query,
                summary="",
                sources_count=0,
                error=result.error
            )
            
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}")
        return SearchResponse(
            success=False,
            query=request.query,
            summary="",
            sources_count=0,
            error=str(e)
        )


@api_router.get("/agents/capabilities")
async def get_agent_capabilities():
    # Get agent capabilities
    try:
        capabilities = {
            "search_agent": SearchAgent(agent_config).get_capabilities(),
            "chat_agent": ChatAgent(agent_config).get_capabilities()
        }
        return {
            "success": True,
            "capabilities": capabilities
        }
    except Exception as e:
        logger.error(f"Error getting capabilities: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# Wallpaper generation endpoints
async def generate_ai_image(prompt: str, aspect_ratio: str = "9:16", megapixels: str = "1") -> dict:
    """Generate image using AI image generation service"""
    try:
        # Create a more detailed prompt for wallpapers
        enhanced_prompt = f"Phone wallpaper, {prompt}, high resolution, vibrant colors, mobile-optimized, stunning visual"

        # Check if we have real AI image generation configured
        # This would require actual MCP integration with image generation services
        # For now, return an error since we don't have real AI image generation
        return {
            "success": False,
            "error": "AI image generation is not configured. Please set up a real image generation service (e.g., DALL-E, Midjourney, Stable Diffusion) to generate images."
        }

    except Exception as e:
        logger.error(f"Error in AI image generation: {e}")
        return {"success": False, "error": str(e)}


@api_router.post("/wallpapers/generate", response_model=WallpaperResponse)
async def generate_wallpaper(request: WallpaperRequest):
    """Generate AI wallpaper using image generation API"""
    try:
        wallpaper_id = str(uuid.uuid4())

        # Generate image using AI
        image_result = await generate_ai_image(
            request.prompt,
            request.aspect_ratio,
            request.megapixels
        )

        if not image_result["success"]:
            # Raise HTTP exception instead of returning error response
            error_msg = image_result.get("error", "Failed to generate image")
            raise HTTPException(status_code=503, detail=error_msg)

        # Store in database
        wallpaper = Wallpaper(
            id=wallpaper_id,
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
            image_url=image_result["image_url"],
            image_data=image_result["image_data"]
        )

        await db.wallpapers.insert_one(wallpaper.dict())

        return WallpaperResponse(
            success=True,
            id=wallpaper_id,
            prompt=request.prompt,
            image_url=image_result["image_url"],
            preview_url=image_result["image_url"]
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error generating wallpaper: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/wallpapers", response_model=List[WallpaperResponse])
async def get_wallpapers():
    """Get all generated wallpapers"""
    try:
        wallpapers = await db.wallpapers.find().sort("created_at", -1).to_list(100)
        return [
            WallpaperResponse(
                success=True,
                id=w["id"],
                prompt=w["prompt"],
                image_url=w["image_url"],
                preview_url=w["image_url"],
                created_at=w["created_at"]
            )
            for w in wallpapers
        ]
    except Exception as e:
        logger.error(f"Error getting wallpapers: {e}")
        return []


@api_router.get("/wallpapers/{wallpaper_id}", response_model=WallpaperResponse)
async def get_wallpaper(wallpaper_id: str):
    """Get specific wallpaper by ID"""
    try:
        wallpaper = await db.wallpapers.find_one({"id": wallpaper_id})
        if not wallpaper:
            raise HTTPException(status_code=404, detail="Wallpaper not found")

        return WallpaperResponse(
            success=True,
            id=wallpaper["id"],
            prompt=wallpaper["prompt"],
            image_url=wallpaper["image_url"],
            preview_url=wallpaper["image_url"],
            created_at=wallpaper["created_at"]
        )
    except Exception as e:
        logger.error(f"Error getting wallpaper: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging config
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Initialize agents on startup
    global search_agent, chat_agent
    logger.info("Starting AI Agents API...")
    
    # Lazy agent init for faster startup
    logger.info("AI Agents API ready!")


@app.on_event("shutdown")
async def shutdown_db_client():
    # Cleanup on shutdown
    global search_agent, chat_agent
    
    # Close MCP
    if search_agent and search_agent.mcp_client:
        # MCP cleanup automatic
        pass
    
    client.close()
    logger.info("AI Agents API shutdown complete.")
