const projections = [mercator, nicolosi, robinson, winkelTripel, mollweide];

function getProjectionById(id) {
  return projections.find((p) => p.id === id);
}

function getAllProjections() {
  return projections;
}
