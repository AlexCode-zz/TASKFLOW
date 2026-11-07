from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "TaskFlow"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite:///./taskflow.db"

    BACKEND_CORS_ORIGINS: str = "http://localhost:5173"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()
