import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
    const {token} = req.headers;

    if(!token) {
        return res.json({success: false, error: 'Not Authorized Login Again'});
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.body.userId = decoded.id;
        next();
    } catch (error) {
        console.log(error);
        res.json({success: false, error: 'Please authenticate' });
    }
}

export default authMiddleware;