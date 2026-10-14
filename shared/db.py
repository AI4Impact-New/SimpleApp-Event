"""
PostgreSQL database connection module for AWS Lambda.
Uses psycopg2 with connection pooling for Lambda execution.
"""

import os
import json
import logging
from contextlib import contextmanager
from typing import Generator, Any, Dict, List, Optional

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

# Connection pool (initialized lazily)
_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def get_db_config() -> Dict[str, str]:
    """Get database configuration from environment variables."""
    return {
        "host": os.environ.get("DB_HOST", "localhost"),
        "port": os.environ.get("DB_PORT", "5432"),
        "database": os.environ.get("DB_NAME", "payintelli"),
        "user": os.environ.get("DB_USER", "postgres"),
        "password": os.environ.get("DB_PASSWORD", ""),
    }


def init_connection_pool() -> pool.ThreadedConnectionPool:
    """Initialize the database connection pool."""
    global _connection_pool
    
    if _connection_pool is None:
        config = get_db_config()
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=2,
            host=config["host"],
            port=config["port"],
            database=config["database"],
            user=config["user"],
            password=config["password"],
            connect_timeout=5,
            sslmode=os.environ.get("DB_SSLMODE", "require"),
        )
        logger.info("Database connection pool initialized")
    
    return _connection_pool


def get_connection_pool() -> pool.ThreadedConnectionPool:
    """Get the existing connection pool or create a new one."""
    global _connection_pool
    
    if _connection_pool is None:
        return init_connection_pool()
    
    return _connection_pool


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    Automatically handles connection acquisition and release.
    
    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users")
                result = cur.fetchall()
    """
    pool = get_connection_pool()
    conn = None
    
    try:
        conn = pool.getconn()
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            pool.putconn(conn)


@contextmanager
def get_db_cursor(cursor_type: str = "dict") -> Generator:
    """
    Context manager for database cursors.
    
    Args:
        cursor_type: "dict" for RealDictCursor, "tuple" for default
        
    Usage:
        with get_db_cursor("dict") as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
    """
    with get_db_connection() as conn:
        cursor_class = RealDictCursor if cursor_type == "dict" else None
        cur = conn.cursor(cursor_factory=cursor_class)
        
        try:
            yield cur
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Cursor error: {e}")
            raise
        finally:
            cur.close()


def execute_query(
    query: str, 
    params: Optional[tuple] = None,
    fetch: str = "one"
) -> Optional[Any]:
    """
    Execute a query and return results.
    
    Args:
        query: SQL query string
        params: Query parameters tuple
        fetch: "one", "all", or "none"
        
    Returns:
        Query result based on fetch mode
    """
    with get_db_cursor("dict") as cur:
        cur.execute(query, params)
        
        if fetch == "one":
            return cur.fetchone()
        elif fetch == "all":
            return cur.fetchall()
        elif fetch == "none":
            return None
        else:
            raise ValueError(f"Invalid fetch mode: {fetch}")


def execute_many(query: str, params_list: List[tuple]) -> None:
    """Execute a query with multiple parameter sets."""
    with get_db_cursor("dict") as cur:
        cur.executemany(query, params_list)


def close_connection_pool() -> None:
    """Close all connections in the pool."""
    global _connection_pool
    
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")
