# app/models/__init__.py

# Import in dependency order — no forward refs unresolved
from app.models.zone import Zone, ZoneCreate, ZoneRead
from app.models.user import User, UserCreate, UserRead, UserRole
from app.models.bin import Bin, BinCreate, BinRead, BinLive, FillStatus, BinStatus
from app.models.sensor_node import SensorNode, SensorNodeCreate, SensorNodeRead
from app.models.sensor_reading import SensorReading, SensorPayload, SensorReadingRead
from app.models.alert import Alert, AlertCreate, AlertRead, AlertStatus, AlertType, AlertSeverity
from app.models.alert_settings import AlertSettings, AlertSettingsRead, AlertSettingsUpdate
from app.models.route_waypoint import RouteWaypoint, WaypointRead, WaypointStatus
from app.models.collection_route import CollectionRoute, RouteRequest, RouteRead, RouteAssign, RouteStatus

# Force Pydantic v2 to resolve all forward references now that
# every model is imported and defined
BinRead.model_rebuild()
BinLive.model_rebuild()
AlertRead.model_rebuild()
WaypointRead.model_rebuild()
RouteRead.model_rebuild()