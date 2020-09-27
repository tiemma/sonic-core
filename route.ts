import express, { Router, Request, Response } from "express";

const router = Router();
const app = express();

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
    (req: Request, _: Response) => {
        return {"id": req.params.id}
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
 *     responses:
 *       201:
 *         description: Budget created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/createBudgetResp'
 *       400:
 *         description: Bad request on budget request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/badBudgetResp'
 *       401:
 *         description: Token not provided
 *     parameters:
 *     - name: id
 *       in: path
 *       description: Organization ID
 *       required: true
 *       defaultTemplate: $Organization[0].id
 *       schema:
 *         $ref: "#/definitions/pathID"
 */
router.get(
    "/organizations/:id/budgets",
    (req: Request, _: Response) => {
        console.log(req.params)
        return {"id": "Hello world"}
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
router.get("/organizations", (req: Request, res: Response) => {
    console.log(req.params)
    return res.json([{"id": "bbe550ea-d564-4099-a0a5-bb60940529d1"}])
});

app.use("/api/v1", router);
app.listen(3000, () => {
    console.info("Express server started on port");
});