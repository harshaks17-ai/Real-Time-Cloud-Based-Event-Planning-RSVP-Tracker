from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator

from .models import UserRole, EventStatus, RSVPStatus


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    role: UserRole = UserRole.ATTENDEE


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: UserRole

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EventIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    event_type: str = "workshop"
    event_date: str
    start_time: str = "10:00"
    end_time: str = "12:00"
    venue: str = ""
    online_link: str = ""
    max_capacity: int = Field(default=100, ge=1, le=1_000_000)
    registration_deadline: str
    status: EventStatus = EventStatus.PUBLISHED

    @field_validator("event_date", "registration_deadline")
    @classmethod
    def valid_date(cls, v: str) -> str:
        from datetime import datetime as dt
        dt.strptime(v, "%Y-%m-%d")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def valid_time(cls, v: str) -> str:
        from datetime import datetime as dt
        dt.strptime(v, "%H:%M")
        return v


class EventOut(BaseModel):
    id: str
    organizer_id: str
    organizer_name: str = ""
    name: str
    description: str
    event_type: str
    event_date: str
    start_time: str
    end_time: str
    venue: str
    online_link: str
    max_capacity: int
    registration_deadline: str
    status: EventStatus
    going_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RSVPIn(BaseModel):
    status: RSVPStatus


class RSVPOut(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str = ""
    user_email: str = ""
    status: RSVPStatus
    responded_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CountsOut(BaseModel):
    going: int = 0
    maybe: int = 0
    not_going: int = 0
    waitlisted: int = 0
    capacity: int = 0
    available: int = 0
    response_rate: float = 0.0
    total_invited: int = 0
    total_responses: int = 0


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)


class AnnouncementOut(BaseModel):
    id: str
    event_id: str
    title: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: str
    event_id: str | None
    type: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsOut(BaseModel):
    event_id: str
    going: int
    maybe: int
    not_going: int
    waitlisted: int
    capacity: int
    available_seats: int
    capacity_utilization: float
    response_rate: float
    total_responses: int
    growth: list[dict]
