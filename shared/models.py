"""
Database models for PayIntelli Academy platform.
Uses dataclasses for structured data representation.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class UserRole(str, Enum):
    """User roles in the system."""
    ADMIN = "admin"
    ORGANIZER = "organizer"
    ATTENDEE = "attendee"


class EventStatus(str, Enum):
    """Event status values."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventType(str, Enum):
    """Event type values."""
    OFFLINE = "offline"
    ONLINE = "online"
    HYBRID = "hybrid"


class EventVisibility(str, Enum):
    """Event visibility: global (listed) or private (QR only)."""
    GLOBAL = "global"
    PRIVATE = "private"


class PollStatus(str, Enum):
    """Poll status values."""
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"


class UserType(str, Enum):
    """User type: student or professional."""
    STUDENT = "student"
    PROFESSIONAL = "professional"


class CourseStatus(str, Enum):
    """Course status values."""
    DRAFT = "draft"
    PUBLISHED = "published"


class RegistrationStatus(str, Enum):
    """Course registration status."""
    INTERESTED = "interested"
    APPLIED = "applied"
    REGISTERED = "registered"
    COMPLETED = "completed"
    DROPPED = "dropped"


class ClassType(str, Enum):
    """Course class/session type."""
    RECORDED = "recorded"
    ONLINE = "online"
    IN_PERSON = "in_person"


class CertificateType(str, Enum):
    """Issued certificate type."""
    ATTENDANCE = "attendance"
    COMPLETION = "completion"


@dataclass
class User:
    """User model."""
    id: str
    cognito_id: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    role: UserRole = UserRole.ATTENDEE
    user_type: Optional[str] = None  # 'student' | 'professional'
    university: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    designation: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "cognito_id": self.cognito_id,
            "email": self.email,
            "name": self.name,
            "phone": self.phone,
            "company": self.company,
            "role": self.role.value,
            "user_type": self.user_type,
            "university": self.university,
            "course": self.course,
            "year_of_study": self.year_of_study,
            "city": self.city,
            "state": self.state,
            "designation": self.designation,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class Event:
    """Event model."""
    id: str
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_type: EventType = EventType.OFFLINE
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    created_by: str = None
    status: EventStatus = EventStatus.DRAFT
    qr_code: Optional[str] = None
    max_attendees: Optional[int] = None
    visibility: EventVisibility = EventVisibility.GLOBAL
    created_at: datetime = field(default_factory=datetime.utcnow)
    is_exam: bool = False
    course_id: Optional[str] = None
    issue_attendance_certificate: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "location": self.location,
            "event_type": self.event_type.value if self.event_type else None,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "created_by": self.created_by,
            "status": self.status.value,
            "qr_code": self.qr_code,
            "max_attendees": self.max_attendees,
            "visibility": self.visibility.value if self.visibility else "global",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_exam": getattr(self, "is_exam", False),
            "course_id": getattr(self, "course_id", None),
            "issue_attendance_certificate": getattr(self, "issue_attendance_certificate", False),
        }


@dataclass
class Attendance:
    """Attendance record model."""
    id: str
    user_id: str
    event_id: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    mode: Optional[str] = None  # recorded, online, in_person
    course_id: Optional[str] = None
    class_id: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "mode": getattr(self, "mode", None),
            "course_id": getattr(self, "course_id", None),
            "class_id": getattr(self, "class_id", None),
        }


@dataclass
class Poll:
    """Poll model."""
    id: str
    event_id: str
    question: str
    created_by: Optional[str] = None
    status: PollStatus = PollStatus.DRAFT
    material_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "question": self.question,
            "created_by": self.created_by,
            "status": self.status.value,
            "material_id": self.material_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class PollOption:
    """Poll option model."""
    id: str
    poll_id: str
    option_text: str
    is_correct: bool = False
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "poll_id": self.poll_id,
            "option_text": self.option_text,
            "is_correct": self.is_correct,
        }


@dataclass
class Vote:
    """Vote model."""
    id: str
    poll_id: str
    option_id: str
    user_id: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "poll_id": self.poll_id,
            "option_id": self.option_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class Material:
    """Learning material model."""
    id: str
    title: str
    file_url: str
    event_id: Optional[str] = None
    file_type: Optional[str] = None
    uploaded_by: Optional[str] = None
    course_id: Optional[str] = None
    class_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "title": self.title,
            "file_url": self.file_url,
            "file_type": self.file_type,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.created_at.isoformat() if self.created_at else None,
            "course_id": getattr(self, "course_id", None),
            "class_id": getattr(self, "class_id", None),
        }


# Course models

@dataclass
class Course:
    """Course / program model."""
    id: str
    title: str
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    status: CourseStatus = CourseStatus.DRAFT
    display_order: int = 0
    slug: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    delivery_modes: Optional[List[str]] = None  # recorded, online, in_person

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "short_description": self.short_description,
            "full_description": self.full_description,
            "status": self.status.value if self.status else "draft",
            "display_order": self.display_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "delivery_modes": getattr(self, "delivery_modes", None) or [],
        }


@dataclass
class CourseHighlight:
    """Course highlight (e.g. Duration: 12 weeks)."""
    id: str
    course_id: str
    label: str
    value: str
    sort_order: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "label": self.label,
            "value": self.value,
            "sort_order": self.sort_order,
        }


@dataclass
class CoursePhase:
    """Course phase / module."""
    id: str
    course_id: str
    title: str
    subtitle: Optional[str] = None
    sort_order: int = 0
    phase_items: Optional[List["CoursePhaseItem"]] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "title": self.title,
            "subtitle": self.subtitle,
            "sort_order": self.sort_order,
            "phase_items": [p.to_dict() for p in (self.phase_items or [])],
        }


@dataclass
class CoursePhaseItem:
    """Bullet under a phase (what you'll learn / outcome)."""
    id: str
    phase_id: str
    item_type: str
    text: str
    sort_order: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "phase_id": self.phase_id,
            "item_type": self.item_type,
            "text": self.text,
            "sort_order": self.sort_order,
        }


@dataclass
class CourseBenefit:
    """Course benefit (why choose)."""
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "title": self.title,
            "description": self.description,
            "icon": self.icon,
            "sort_order": self.sort_order,
        }


@dataclass
class CourseAudience:
    """Target audience (who should attend)."""
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    sort_order: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "title": self.title,
            "description": self.description,
            "sort_order": self.sort_order,
        }


@dataclass
class CourseCareerOutcome:
    """Career outcome bullet."""
    id: str
    course_id: str
    text: str
    sort_order: int = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "text": self.text,
            "sort_order": self.sort_order,
        }


@dataclass
class CourseCertificate:
    """Certificate info (one per course)."""
    id: str
    course_id: str
    title: Optional[str] = None
    provider: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    external_config: Optional[dict] = None
    completion_rules: Optional[dict] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "title": self.title,
            "provider": self.provider,
            "description": self.description,
            "image_url": self.image_url,
            "external_config": getattr(self, "external_config", None),
            "completion_rules": getattr(self, "completion_rules", None),
        }


@dataclass
class CourseClass:
    """Course class/session (recorded, online, in_person)."""
    id: str
    course_id: str
    title: str
    class_type: str  # recorded, online, in_person
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    zoom_link: Optional[str] = None
    location: Optional[str] = None
    recording_material_id: Optional[str] = None
    event_id: Optional[str] = None
    sort_order: int = 0
    created_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "title": self.title,
            "description": self.description,
            "class_type": self.class_type,
            "duration_minutes": self.duration_minutes,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "zoom_link": self.zoom_link,
            "location": self.location,
            "recording_material_id": self.recording_material_id,
            "event_id": self.event_id,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class CourseRegistration:
    """User registration for a course."""
    id: str
    course_id: str
    user_id: str
    created_at: Optional[datetime] = None
    status: str = "registered"
    updated_at: Optional[datetime] = None
    notes: Optional[str] = None
    source: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "course_id": self.course_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": getattr(self, "status", "registered"),
            "updated_at": self.updated_at.isoformat() if getattr(self, "updated_at", None) else None,
            "notes": getattr(self, "notes", None),
            "source": getattr(self, "source", None),
        }


@dataclass
class Exam:
    """Exam for a course."""
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    type: Optional[str] = None
    max_score: Optional[int] = None
    pass_score: Optional[int] = None
    is_proctored: bool = False
    created_at: Optional[datetime] = None


@dataclass
class ExamAttempt:
    """User exam attempt."""
    id: str
    exam_id: str
    user_id: str
    score: Optional[float] = None
    status: Optional[str] = None  # pending, passed, failed
    attempted_at: Optional[datetime] = None
    metadata: Optional[dict] = None


@dataclass
class CertificateIssued:
    """Issued certificate (attendance or completion)."""
    id: str
    user_id: str
    certificate_type: str  # attendance, completion
    course_id: Optional[str] = None
    event_id: Optional[str] = None
    provider: Optional[str] = None
    certificate_url: Optional[str] = None
    external_certificate_id: Optional[str] = None
    issued_at: Optional[datetime] = None
    metadata: Optional[dict] = None


# Repository interfaces


class UserRepository:
    """Interface for user data operations."""
    
    def get_by_id(self, user_id: str) -> Optional[User]:
        raise NotImplementedError
    
    def get_by_cognito_id(self, cognito_id: str) -> Optional[User]:
        raise NotImplementedError
    
    def create(self, user: User) -> User:
        raise NotImplementedError
    
    def update(self, user: User) -> User:
        raise NotImplementedError
    
    def get_or_create_from_cognito(self, cognito_id: str, email: str, name: Optional[str] = None) -> User:
        raise NotImplementedError


class EventRepository:
    """Interface for event data operations."""
    
    def get_by_id(self, event_id: str) -> Optional[Event]:
        raise NotImplementedError
    
    def create(self, event: Event) -> Event:
        raise NotImplementedError
    
    def update(self, event: Event) -> Event:
        raise NotImplementedError
    
    def delete(self, event_id: str) -> bool:
        raise NotImplementedError
    
    def list_by_organizer(self, organizer_id: str, limit: int = 50) -> List[Event]:
        raise NotImplementedError
    
    def list_published(self, limit: int = 50) -> List[Event]:
        raise NotImplementedError
    
    def list_all(self, limit: int = 50, offset: int = 0) -> List[Event]:
        raise NotImplementedError


class AttendanceRepository:
    """Interface for attendance data operations."""
    
    def get_by_event_and_user(self, event_id: str, user_id: str) -> Optional[Attendance]:
        raise NotImplementedError
    
    def create(self, attendance: Attendance) -> Attendance:
        raise NotImplementedError
    
    def list_by_event(self, event_id: str) -> List[Attendance]:
        raise NotImplementedError
    
    def list_by_user(self, user_id: str, limit: int = 50) -> List[Attendance]:
        raise NotImplementedError
    
    def count_by_event(self, event_id: str) -> int:
        raise NotImplementedError


class PollRepository:
    """Interface for poll data operations."""
    
    def get_by_id(self, poll_id: str) -> Optional[Poll]:
        raise NotImplementedError
    
    def create(self, poll: Poll) -> Poll:
        raise NotImplementedError
    
    def update(self, poll: Poll) -> Poll:
        raise NotImplementedError
    
    def delete(self, poll_id: str) -> bool:
        raise NotImplementedError
    
    def list_by_event(self, event_id: str) -> List[Poll]:
        raise NotImplementedError
    
    def get_active_poll(self, event_id: str) -> Optional[Poll]:
        raise NotImplementedError


class PollOptionRepository:
    """Interface for poll option data operations."""
    
    def get_by_id(self, option_id: str) -> Optional[PollOption]:
        raise NotImplementedError
    
    def create(self, option: PollOption) -> PollOption:
        raise NotImplementedError
    
    def get_by_poll(self, poll_id: str) -> List[PollOption]:
        raise NotImplementedError
    
    def delete_by_poll(self, poll_id: str) -> None:
        raise NotImplementedError


class VoteRepository:
    """Interface for vote data operations."""
    
    def has_voted(self, poll_id: str, user_id: str) -> bool:
        raise NotImplementedError
    
    def create(self, vote: Vote) -> Vote:
        raise NotImplementedError
    
    def count_by_option(self, option_id: str) -> int:
        raise NotImplementedError
    
    def list_by_poll(self, poll_id: str) -> List[Vote]:
        raise NotImplementedError


class MaterialRepository:
    """Interface for material data operations."""
    
    def get_by_id(self, material_id: str) -> Optional[Material]:
        raise NotImplementedError
    
    def create(self, material: Material) -> Material:
        raise NotImplementedError
    
    def delete(self, material_id: str) -> bool:
        raise NotImplementedError
    
    def list_by_event(self, event_id: str) -> List[Material]:
        raise NotImplementedError


class CourseRepository:
    """Interface for course data operations."""

    def get_by_id(self, course_id: str) -> Optional[Course]:
        raise NotImplementedError

    def list(
        self,
        limit: int = 50,
        status_filter: Optional[str] = None,
        full: bool = False,
    ) -> List:
        raise NotImplementedError

    def create(self, course: Course, children: dict) -> Course:
        raise NotImplementedError

    def update(self, course_id: str, course: Course, children: dict) -> Optional[Course]:
        raise NotImplementedError

    def delete(self, course_id: str) -> bool:
        raise NotImplementedError

    def register(self, course_id: str, user_id: str) -> bool:
        raise NotImplementedError
