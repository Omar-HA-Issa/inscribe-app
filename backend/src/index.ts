import "dotenv/config";
import app from "./server";
import { logger } from "./shared/utils/logger";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
