// The brief names three relevance contexts: cloud platform, microservices, language.
// Cloud and language targets are editable in Settings (stored in the database); env vars are the default.
import { currentIcp } from "./settings";

export const icp = () => currentIcp();
