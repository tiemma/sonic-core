import express, {Router, Request, Response } from "express";

const router = Router();
const app = express();

import swaggerUI from "swagger-ui-express";
import * as fs from "fs";

import {getResponse} from "..";

const customCss = ".topbar { display: none !important;}";

const swaggerOptions = require("./swagger-config");
let swaggerSpec;
try {
    swaggerSpec = JSON.parse(fs.readFileSync("./dist/swagger.json", {encoding: "utf8"}))
} catch(e) {
    swaggerSpec = {};
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(getResponse(app, swaggerOptions, './dist/swagger.json'));

/**
 * @swagger
 * /organizations/{organizationID}:
 *   get:
 *     name: OrganizationID
 *     summary: Get budget
 *     tags:
 *       - Budget
 *     responses:
 *       200:
 *         description: Budget retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/organizationResp'
 *       401:
 *         description: Token not provided
 *       500:
 *         description: Budget retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/organizationErrorResp'
 *     parameters:
 *     - name: organizationID
 *       in: path
 *       description: Budget ID
 *       defaultTemplate: $Organization[0].id
 *       required: true
 *       schema:
 *         $ref: "#/definitions/pathID"
 */
router.get(
    "/organizations/:organizationID",
    (req: Request, res: Response) => {
        return res.json({"organizationID": req.params.organizationID})
    }
);


/**
 * @swagger
 * /budgets/{budgetID}:
 *   get:
 *     name: GetBudget
 *     summary: Get budget
 *     tags:
 *       - Budget
 *     responses:
 *       200:
 *         description: Budget retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/getBudgetResp'
 *       401:
 *         description: Token not provided
 *     parameters:
 *     - name: budgetID
 *       in: path
 *       description: Budget ID
 *       defaultTemplate: $Budget.id
 *       required: true
 *       schema:
 *         $ref: "#/definitions/pathID"
 */
router.get(
    "/budgets/:budgetID",
    (req: Request, res: Response) => {
        return res.json({"id": req.params.budgetID})
    }
);


/**
 * @swagger
 * /organizations/{id}/budgets:
 *   post:
 *     name: Budget
 *     summary: Create budget
 *     description: Creates a budget under an organization
 *     tags:
 *       - Budget
 *     requestBody:
 *       description: Details to authenticate
 *       required: true
 *       content:
 *         "application/json":
 *            schema:
 *              $ref: "#/definitions/createBudget"
 *     parameters:
 *     - name: id
 *       in: path
 *       description: Organization ID
 *       required: true
 *       defaultTemplate: $Organization[0].id
 *       schema:
 *         $ref: "#/definitions/pathID"
 */
router.post(
    "/organizations/:id/budgets",
    (req: Request, res: Response) => {
        return res.json({"id": req.params.id})
    }
);


/**
 * @swagger
 * /organizations:
 *   get:
 *     name: Organization
 *     summary: Get organizations
 *     description: Gets all organizations
 *     tags:
 *       - Organization
 *     produces: application/json
 *     responses:
 *       200:
 *         description: Organisations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/getOrganizationsResp'
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Super Admin privileges required
 */
router.get("/organizations", (_req: Request, res: Response) => {
    return res.json([{"id": "bbe550ea-d564-4099-a0a5-bb60940529d1"}])
});

/**
 * @swagger
 * /clusters:
 *   get:
 *     name: Cluster
 *     summary: Get clusters
 *     description: Gets all clusters for the user's organization
 *     tags:
 *       - Cluster
 *     responses:
 *       200:
 *         description: Clusters retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/getClustersByOrganizationResp'
 *       400:
 *         description: Missing parameter in request body
 *       401:
 *         description: Token not provided
 */
router.get("/clusters", (_req: Request, res: Response) => {
    return res.json([{"id": "bbe550ea-d564-4099-a0a5-bb60940529d1"}])
});

router.post("/clusters", (_req: Request, res: Response) => {
    return res.json([{"id": "bbe550ea-d564-4099-a0a5-bb60940529d1"}])
});


app.use("/api/v1", router);

app.use(
    "/api/docs",
    swaggerUI.serve,
    swaggerUI.setup(swaggerSpec, {}, {}, customCss)
);


app.listen(3200, () => {
    console.info("Express server started on port: " + 3200);
});