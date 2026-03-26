class Notificacion {
  constructor({ nivel, mensaje, fechaHora, confirmada }) {
    this.nivel = nivel;
    this.mensaje = mensaje;
    this.fechaHora = fechaHora;
    this.confirmada = confirmada;
  }
}

module.exports = Notificacion;
