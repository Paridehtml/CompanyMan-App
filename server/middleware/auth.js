const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  console.log('auth middleware executed for:', req.method, req.originalUrl);
  console.log('Authorization header:', req.header('Authorization'));

  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    console.log('user in auth middleware:', req.user);
    next();
  } catch (err) {
    console.error('Token is invalid:', err);
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};
