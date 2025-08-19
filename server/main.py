from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query # type: ignore
from sqlmodel import Field, Session, SQLModel, create_engine, select # type: ignore
from app.api import routes_auth
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)
 

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()

app.include_router(routes_auth.router)
@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
async def root():
    return {"message": "Hello World"}
