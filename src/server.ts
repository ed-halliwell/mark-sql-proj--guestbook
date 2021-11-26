import express, { text } from "express";
import cors from "cors";
import { Client } from "pg";

//As your database is on your local machine, with default port,
//and default username and password,
//we only need to specify the (non-default) database name.

const client = new Client({ database: "guestbook" });

// Connect to the db
const guestbookAPIConnection = async () => {
  await client.connect();
  console.log("Connected to guestbook db!");
};
guestbookAPIConnection();

const app = express();
app.use(cors());

// Middleware to parse a JSON body in requests
app.use(express.json());

//When this route is called, return the most recent 100 signatures in the db
app.get("/signatures", async (req, res) => {
  const text = "SELECT * FROM signatures ORDER BY time DESC LIMIT 100";
  const signatures = await client.query(text);
  const signatureData = signatures.rows;
  res.status(200).json({
    status: "success",
    data: {
      signatureData,
    },
  });
});

app.get("/signatures/:id", async (req, res) => {
  // :id indicates a "route parameter", available as req.params.id
  //  see documentation: https://expressjs.com/en/guide/routing.html
  const id = parseInt(req.params.id); // params are always string type

  const signature = await client.query(
    "SELECT * FROM signatures WHERE id = ($1)",
    [id]
  );
  const matchingSignature = signature.rows[0];

  if (signature) {
    res.status(200).json({
      status: "success",
      data: {
        matchingSignature,
      },
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

app.post("/signatures", async (req, res) => {
  const { name, message } = req.body;
  console.log(name, message);
  if (typeof name === "string") {
    const text = "INSERT INTO signatures VALUES (default, $1, $2)";
    const values = [name, message];
    const createdSignature = await client.query(text, values);
    res.status(201).json({
      status: "success",
      data: {
        signature: createdSignature, //return the relevant data (including its db-generated id)
      },
    });
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for name is required in your JSON body",
      },
    });
  }
});

//update a signature.
app.put("/signatures/:id", async (req, res) => {
  const { name, message } = req.body;
  const id = parseInt(req.params.id);
  console.log(id, name, message, typeof message);
  if (typeof name === "string") {
    const updateResponse = await client.query(
      "UPDATE signatures SET signature = $2, message = $3 WHERE id = $1",
      [id, name, message]
    );

    if (updateResponse.rowCount === 1) {
      const updatedSignature = updateResponse.rows[0];
      res.status(200).json({
        status: "success",
        data: {
          signature: updatedSignature,
        },
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Could not find a signature with that id identifier",
        },
      });
    }
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for name is required in your JSON body",
      },
    });
  }
});

app.delete("/signatures/:id", async (req, res) => {
  const id = parseInt(req.params.id); // params are string type

  const queryResult: any = await client.query(
    "DELETE FROM signatures WHERE id = ($1)",
    [id]
  );
  const didRemove = queryResult.rowCount === 1;

  if (didRemove) {
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE#responses
    // we've gone for '200 response with JSON body' to respond to a DELETE
    //  but 204 with no response body is another alternative:
    //  res.status(204).send() to send with status 204 and no JSON body
    res.status(200).json({
      status: "success",
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

export default app;
