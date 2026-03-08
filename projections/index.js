const projections = [mercator, nicolosi, robinson];

function getProjectionById(id) {
  return projections.find((p) => p.id === id);
}

function getAllProjections() {
  return projections;
}
