// backend/src/middlewares/roleMiddleware.js

const LIBRARIAN_ROLE = 'LIBRARIAN';


const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === LIBRARIAN_ROLE /* || req.user.role === ADMIN_ROLE */ )) {
        next();
    } else {
        res.status(403).json({ message: `Доступ заборонено. Потрібні права ${LIBRARIAN_ROLE}.` });
    }
};

module.exports = {
    isAdmin,
    LIBRARIAN_ROLE,
};