const { Usuario, Rol, Empresa } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function sign(u) {
  const payload = { id: u.id, email: u.email, rol_id: u.rol_id, empresa_id: u.empresa_id };
  const opts = process.env.JWT_EXPIRES_IN ? { expiresIn: process.env.JWT_EXPIRES_IN } : {};
  return jwt.sign(payload, process.env.JWT_SECRET, opts);
}

exports.getUsuariosAdmin = async (_req, res) => {
  try {
    const rows = await Usuario.findAll({ include: [{ model: Rol, as: 'rol' }, { model: Empresa, as: 'empresa' }] });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error al listar' }); }
};

exports.getUsuarios = async (_req, res) => {
  try {
    const rows = await Usuario.findAll({ attributes: { exclude: ['password'] } });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Error al listar' }); }
};

exports.getUsuarioById = async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!u) return res.status(404).json({ error: 'No encontrado' });
    res.json(u);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
};

exports.createUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol_id, empresa_id } = req.body;
    if (!nombre || !email || !password || !rol_id) return res.status(400).json({ error: 'Campos requeridos' });

    const exists = await Usuario.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    const u = await Usuario.create({ nombre, email, password: hash, rol_id, empresa_id: empresa_id || null });
    res.status(201).json({ id: u.id, nombre: u.nombre, email: u.email });
  } catch (e) { res.status(500).json({ error: 'Error al crear' }); }
};

exports.updateUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol_id, empresa_id, estado } = req.body;
    const u = await Usuario.findByPk(req.params.id);
    if (!u) return res.status(404).json({ error: 'No encontrado' });

    if (email && email !== u.email) {
      const dup = await Usuario.findOne({ where: { email } });
      if (dup) return res.status(409).json({ error: 'Email ya registrado' });
    }

    if (password) req.body.password = await bcrypt.hash(password, 10);
    await u.update({ nombre, email, password: req.body.password, rol_id, empresa_id, estado });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error al actualizar' }); }
};

exports.deleteUsuario = async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.id);
    if (!u) return res.status(404).json({ error: 'No encontrado' });
    await u.destroy();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Error al eliminar' }); }
};

exports.loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });

    const u = await Usuario.findOne({ where: { email } });
    if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = sign(u);
    res.json({ token, user: { id: u.id, nombre: u.nombre, email: u.email, rol_id: u.rol_id, empresa_id: u.empresa_id } });
  } catch (e) { res.status(500).json({ error: 'Error de login' }); }
};

exports.logoutUsuario = async (_req, res) => {
  res.json({ ok: true }); // JWT es stateless
};

exports.loginConGoogle = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'idToken requerido' });

    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload(); // { email, name, ... }
    const email = payload.email;
    let u = await Usuario.findOne({ where: { email } });

    if (!u) {
      u = await Usuario.create({
        nombre: payload.name || email,
        email,
        password: await bcrypt.hash(Math.random().toString(36).slice(2), 10),
        rol_id: 3,            // cliente por defecto
        empresa_id: null
      });
    }

    const token = sign(u);
    res.json({ token, user: { id: u.id, nombre: u.nombre, email: u.email, rol_id: u.rol_id, empresa_id: u.empresa_id } });
  } catch (e) { res.status(500).json({ error: 'Login Google falló' }); }
};
