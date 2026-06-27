from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router
import asyncio

app = FastAPI(title="mod-auditoria", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "module": "mod-auditoria"}

@app.on_event("startup")
async def startup_event():
    import event_listener
    # Lanzar el listener de auditoría en background
    asyncio.create_task(event_listener.start_listener())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
