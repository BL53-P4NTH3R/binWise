"""Import all table models so SQLModel metadata can register them."""

from app.models.alert import Alert
from app.models.alert_settings import AlertSettings
from app.models.bin import Bin
from app.models.collection_route import CollectionRoute
from app.models.route_waypoint import RouteWaypoint
from app.models.sensor_node import SensorNode
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.models.zone import Zone
