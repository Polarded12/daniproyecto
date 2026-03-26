function setRol(rol) {
  localStorage.setItem("rol", rol);
}

function getRol() {
  return localStorage.getItem("rol");
}

window.rolStore = { setRol, getRol };
