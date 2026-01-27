import "dotenv/config";
import app from "./server";
import { logger } from "./shared/utils/logger";

const PORT = process.env.PORT || 3001;

// Bind to 0.0.0.0 for container environments (Railway, Docker)
app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});
