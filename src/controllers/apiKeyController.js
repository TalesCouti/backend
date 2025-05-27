
exports.getApiKey = async (req, res) => {
    const apiKeyMap = process.env.MAPS_KEY;

    res.json({ apiKeyMap });
};