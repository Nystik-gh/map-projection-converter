const projections = [mercator, miller, nicolosi, polarAzimuthalEquidistant, robinson, winkelTripel, mollweide];

function getProjectionById(id) {
  return projections.find((p) => p.id === id);
}

function getAllProjections() {
  return projections;
}
