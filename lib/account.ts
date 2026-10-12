import { cache } from "react";
import { getCompany } from "./db";

export const getAccount = cache((id: number) => getCompany(id));
