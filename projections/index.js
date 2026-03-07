const projections = [mercator, nicolosi];

function getProjectionById(id) {
  return projections.find((p) => p.id === id);
}

function getAllProjections() {
  return projections;
}
