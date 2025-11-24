// backend/auth.js
const jwt = require('jsonwebtoken');
const { verifyMessage } = require('ethers');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-123';

function generateChallenge(wallet) {
  const timestamp = Date.now();
  const message = `Autenticar em NeuroArte DAO\nWallet: ${wallet}\nTimestamp: ${timestamp}`;
  return { message, timestamp };
}

function verifySignatureAndCreateJWT(wallet, message, signature) {
  try {
    const recoveredAddress = verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return { success: false, error: 'Assinatura inválida' };
    }

    const token = jwt.sign(
      { wallet, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { success: true, token };
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return { success: false, error: 'Erro ao verificar assinatura' };
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { generateChallenge, verifySignatureAndCreateJWT, authMiddleware };
