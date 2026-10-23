"""
User repository layer.
Data access for user operations.
"""

import logging
from typing import Optional, List, Dict, Any

from psycopg2.errors import UniqueViolation

from shared.db import execute_query
from shared.models import User, UserRole, UserRepository as IUserRepository

logger = logging.getLogger(__name__)


class IdentityConflictError(Exception):
    """A different Cognito identity already owns this email's application record."""

    def __init__(self):
        super().__init__("Your account needs an identity-link review. Contact your AI4Impact administrator; your existing records have been preserved.")


class UserRepository(IUserRepository):
    """Repository for user data operations."""
    
    def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        result = execute_query(
            "SELECT * FROM users WHERE id = %s",
            (user_id,),
            fetch="one"
        )
        
        return self._row_to_user(result) if result else None
    
    def get_by_cognito_id(self, cognito_id: str) -> Optional[User]:
        """Get user by Cognito ID."""
        result = execute_query(
            "SELECT * FROM users WHERE cognito_id = %s",
            (cognito_id,),
            fetch="one"
        )
        
        return self._row_to_user(result) if result else None

    def get_by_email(self, email: str) -> Optional[User]:
        row = execute_query("SELECT * FROM users WHERE lower(email) = lower(%s)", (email,), fetch="one")
        return self._row_to_user(row) if row else None

    def get_by_cognito_ids(self, cognito_ids: List[str]) -> dict:
        """Get users by Cognito IDs; returns dict cognito_id -> User for faster list enrichment."""
        if not cognito_ids:
            return {}
        placeholders = ",".join(["%s"] * len(cognito_ids))
        results = execute_query(
            f"SELECT * FROM users WHERE cognito_id IN ({placeholders})",
            tuple(cognito_ids),
            fetch="all"
        )
        out = {}
        for row in results or []:
            user = self._row_to_user(row)
            if user:
                out[user.cognito_id] = user
        return out

    def create(self, user: User) -> User:
        """Create a new user."""
        execute_query(
            """
            INSERT INTO users (
                id, cognito_id, email, name, phone, company, role,
                user_type, university, course, year_of_study, city, state, designation,
                created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                user.id,
                user.cognito_id,
                user.email,
                user.name,
                user.phone,
                user.company,
                user.role.value,
                getattr(user, "user_type", None),
                getattr(user, "university", None),
                getattr(user, "course", None),
                getattr(user, "year_of_study", None),
                getattr(user, "city", None),
                getattr(user, "state", None),
                getattr(user, "designation", None),
                user.created_at,
            ),
            fetch="none"
        )
        
        logger.info(f"Created user: {user.id}")
        return user
    
    def update(self, user: User) -> User:
        """Update an existing user."""
        execute_query(
            """
            UPDATE users SET
                name = %s, phone = %s, company = %s, role = %s,
                user_type = %s, university = %s, course = %s, year_of_study = %s,
                city = %s, state = %s, designation = %s
            WHERE id = %s
            """,
            (
                user.name,
                user.phone,
                user.company,
                user.role.value,
                getattr(user, "user_type", None),
                getattr(user, "university", None),
                getattr(user, "course", None),
                getattr(user, "year_of_study", None),
                getattr(user, "city", None),
                getattr(user, "state", None),
                getattr(user, "designation", None),
                user.id,
            ),
            fetch="none"
        )
        
        logger.info(f"Updated user: {user.id}")
        return user
    
    def get_or_create_from_cognito(
        self, 
        cognito_id: str, 
        email: str, 
        name: Optional[str] = None
    ) -> User:
        """Get existing user or create new one from Cognito data."""
        existing = self.get_by_cognito_id(cognito_id)
        
        if existing:
            return existing
        
        # Email is not an identity proof: never silently rebind a retained profile.
        if self.get_by_email(email):
            raise IdentityConflictError()

        # Create new user
        from shared.models import User
        import uuid
        
        user = User(
            id=str(uuid.uuid4()),
            cognito_id=cognito_id,
            email=email,
            name=name,
            role=UserRole.ATTENDEE,
        )
        
        try:
            return self.create(user)
        except UniqueViolation:
            # Concurrent first requests can race after the initial reads. The
            # failed transaction has rolled back before these fresh lookups.
            existing = self.get_by_cognito_id(cognito_id)
            if existing:
                return existing
            if self.get_by_email(email):
                raise IdentityConflictError() from None
            raise

    def upsert_profile(
        self,
        cognito_id: str,
        email: str,
        name: Optional[str] = None,
        user_type: Optional[str] = None,
        university: Optional[str] = None,
        course: Optional[str] = None,
        year_of_study: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        designation: Optional[str] = None,
        company: Optional[str] = None,
    ) -> User:
        """Get or create user by cognito_id, then update profile fields."""
        import uuid as uuid_mod
        existing = self.get_by_cognito_id(cognito_id)
        if existing:
            if name is not None:
                existing.name = name
            if user_type is not None:
                existing.user_type = user_type
            if university is not None:
                existing.university = university
            if course is not None:
                existing.course = course
            if year_of_study is not None:
                existing.year_of_study = year_of_study
            if city is not None:
                existing.city = city
            if state is not None:
                existing.state = state
            if designation is not None:
                existing.designation = designation
            if company is not None:
                existing.company = company
            return self.update(existing)
        user = User(
            id=str(uuid_mod.uuid4()),
            cognito_id=cognito_id,
            email=email,
            name=name,
            role=UserRole.ATTENDEE,
            user_type=user_type,
            university=university,
            course=course,
            year_of_study=year_of_study,
            city=city,
            state=state,
            designation=designation,
            company=company,
        )
        return self.create(user)

    def update_privacy_consent(self, user_id: str, version: str) -> bool:
        """Update user's privacy policy acceptance (version and timestamp)."""
        try:
            execute_query(
                "UPDATE users SET privacy_policy_version = %s, privacy_policy_accepted_at = NOW() WHERE id = %s",
                (version, user_id),
                fetch="none",
            )
            return True
        except Exception as e:
            logger.warning("update_privacy_consent: %s", e)
            return False

    def _row_to_user(self, row: dict) -> User:
        """Convert database row to User model."""
        return User(
            id=row["id"],
            cognito_id=row["cognito_id"],
            email=row["email"],
            name=row.get("name"),
            phone=row.get("phone"),
            company=row.get("company"),
            role=UserRole(row.get("role", "attendee")),
            user_type=row.get("user_type"),
            university=row.get("university"),
            course=row.get("course"),
            year_of_study=row.get("year_of_study"),
            city=row.get("city"),
            state=row.get("state"),
            designation=row.get("designation"),
            created_at=row.get("created_at"),
        )


def get_or_create_user_from_claims(claims: Dict[str, Any]) -> Optional[User]:
    """Resolve the authenticated Cognito user into the app DB user row."""
    cognito_id = (claims.get("sub") or claims.get("cognito:username") or "").strip()
    if not cognito_id:
        return None

    email = (
        claims.get("email")
        or claims.get("cognito:username")
        or claims.get("username")
        or ""
    ).strip()
    if not email:
        return None

    name = (
        claims.get("name")
        or " ".join(
            part.strip()
            for part in [claims.get("given_name") or "", claims.get("family_name") or ""]
            if part and part.strip()
        )
        or None
    )

    repo = UserRepository()
    return repo.get_or_create_from_cognito(cognito_id=cognito_id, email=email, name=name)
