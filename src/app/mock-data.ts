export const MOCK_COLLECTION_TREE = [
  {
    id: "proj-1",
    name: "Auth Service",
    collections: [
      {
        id: "col-1",
        name: "Users",
        requests: [
          { id: "req-1", name: "Get me", method: "GET" as const },
          { id: "req-2", name: "Create user", method: "POST" as const },
        ],
      },
      {
        id: "col-2",
        name: "Tokens",
        requests: [{ id: "req-3", name: "OAuth token", method: "POST" as const }],
      },
    ],
  },
  {
    id: "proj-2",
    name: "Billing",
    collections: [
      {
        id: "col-3",
        name: "Invoices",
        requests: [{ id: "req-4", name: "List invoices", method: "GET" as const }],
      },
    ],
  },
];
