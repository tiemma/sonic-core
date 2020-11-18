import express, {Router, Request, Response } from "express";

const router = Router();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /animal/{man}/dog:
 *   get:
 *     name: dog
 *     description: Endpoint for dog under a particular man
 *     tags:
 *       - Dog
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/dog'
 *       401:
 *         description: Token not provided
 *       500:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/dogError500'
 *     parameters:
 *     - name: man
 *       in: path
 *       defaultTemplate: $man[0].id
 *       required: true
 */
router.get(
    "/path/:man",
    (req: Request, res: Response) => {
        return res.json({"man": req.params.man})
    }
);


/**
 * @swagger
 * /cat/{mouse}:
 *   get:
 *     name: cat
 *     summary: Get mouse
 *     tags:
 *       - mouse
 *     responses:
 *       200:
 *         description: mouse retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/mouseResp'
 *       401:
 *         description: Token not provided
 *     parameters:
 *     - name: mouse
 *       in: path
 *       description: ID
 *       defaultTemplate: $mouse.id
 *       required: true
 */
router.get(
    "/cat/:mouse",
    (_: Request, res: Response) => {
        return res.send("Data")
    }
);


/**
 * @swagger
 * /mouse/{id}/man:
 *   post:
 *     name: mouse
 *     summary: Create mouse
 *     description: Creates a mouse under a man's house, rhymes with the times dudes
 *     tags:
 *       - mouse
 *     requestBody:
 *       description: Details to authenticate
 *       required: true
 *       content:
 *         "application/json":
 *            schema:
 *              $ref: "#/definitions/createmouse"
 *     parameters:
 *     - name: id
 *       in: path
 *       description: man ID
 *       required: true
 *       defaultTemplate: $man[0].id
 *       schema:
 *         $ref: "#/definitions/pathID"
 */
router.post(
    "/mouse/:id/man",
    (req: Request, res: Response) => {
        return res.json({"id": req.params.id, "body": req.body})
    }
);


/**
 * @swagger
 * /man:
 *   get:
 *     name: man
 *     description: For all men shall find their path in life
 *     tags:
 *       - man
 *     produces: application/json
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/manResponds'
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Super Admin privileges required
 */
router.get("/path", (_req: Request, res: Response) => {
    return res.json([{"id": "bbe550ea-d564-4099-a0a5-bb60940529d1"}])
});

/**
 * @swagger
 * /animal:
 *   get:
 *     name: animals
 *     summary: Get animals
 *     tags:
 *       - Animals
 *     responses:
 *       200:
 *         description: Animals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/animalSpeaks'
 *       400:
 *         description: Missing parameter in request body
 *       401:
 *         description: Token not provided
 */
router.get("/animal", (_req: Request, res: Response) => {
    return res.json([{"id": "bbe550ea-d564-4099-a0a5-bb60940529d1"}])
});

app.use("/api/v1", router);

app.listen(3200, () => {
    console.info("Express server started on port: " + 3200);
});