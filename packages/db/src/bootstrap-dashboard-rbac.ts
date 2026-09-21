import { prisma } from "./index.js";
import { bootstrapDashboardRbac } from "./rbac-bootstrap.js";

prisma.$transaction((database) => bootstrapDashboardRbac(database))
  .then((summary) => console.log(JSON.stringify({ dashboardRbac: summary })))
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
