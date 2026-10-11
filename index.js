const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

function response(data, status = 200) {
  const res = json(data, status);
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  return new Response(res.body, { status: res.status, headers });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function positiveNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${field} must be a number greater than zero`);
  return n;
}

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

async function all(db, sql, ...params) {
  const result = await db.prepare(sql).bind(...params).all();
  return result.results || [];
}

async function first(db, sql, ...params) {
  return db.prepare(sql).bind(...params).first();
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return response({ ok: true });
  if (path === "/" || path === "/api" || path === "/api/health") {
    if (method !== "GET") return response({ error: "Method not allowed" }, 405);
    let database = { connected: false, message: "DB binding is missing" };
    if (env.DB) {
      try {
        await env.DB.prepare("SELECT 1 AS ok").first();
        database = { connected: true };
      } catch (error) {
        database = { connected: false, message: error.message };
      }
    }
    return response({
      ok: true,
      service: "GODIA PRIME CONNECT SOLUTIONS API",
      timestamp: new Date().toISOString(),
      database,
    });
  }

  if (!env.DB) return response({ error: "D1 binding DB is not configured" }, 503);
  const db = env.DB;

  // PRODUCTS
  if (path === "/api/products" && method === "GET") {
    const rows = await all(db, "SELECT * FROM products ORDER BY id DESC");
    return response({ products: rows });
  }

  if (path === "/api/products" && method === "POST") {
    const body = await readBody(request);
    if (!body) return response({ error: "A valid JSON body is required" }, 400);
    try {
      const name = requiredText(body.name, "name");
      const sku = body.sku == null ? null : String(body.sku).trim() || null;
      const price = positiveNumber(body.price, "price");
      const stock = body.stock == null ? 0 : Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0) throw new Error("stock must be a non-negative whole number");
      const result = await db.prepare(
        "INSERT INTO products (name, sku, price, stock, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
      ).bind(name, sku, price, stock).run();
      const product = await first(db, "SELECT * FROM products WHERE id = ?", result.meta.last_row_id);
      return response({ product }, 201);
    } catch (error) {
      return response({ error: error.message }, 400);
    }
  }

  const productMatch = path.match(/^\/api\/products\/(\d+)$/);
  if (productMatch) {
    const id = Number(productMatch[1]);
    if (method === "GET") {
      const product = await first(db, "SELECT * FROM products WHERE id = ?", id);
      return product ? response({ product }) : response({ error: "Product not found" }, 404);
    }
    if (method === "PUT" || method === "PATCH") {
      const body = await readBody(request);
      if (!body) return response({ error: "A valid JSON body is required" }, 400);
      const existing = await first(db, "SELECT * FROM products WHERE id = ?", id);
      if (!existing) return response({ error: "Product not found" }, 404);
      const name = body.name === undefined ? existing.name : requiredText(body.name, "name");
      const sku = body.sku === undefined ? existing.sku : (String(body.sku).trim() || null);
      const price = body.price === undefined ? existing.price : positiveNumber(body.price, "price");
      const stock = body.stock === undefined ? existing.stock : Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0) return response({ error: "stock must be a non-negative whole number" }, 400);
      await db.prepare(
        "UPDATE products SET name = ?, sku = ?, price = ?, stock = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(name, sku, price, stock, id).run();
      return response({ product: await first(db, "SELECT * FROM products WHERE id = ?", id) });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
      return response({ ok: true });
    }
    return response({ error: "Method not allowed" }, 405);
  }

  // CUSTOMERS
  if (path === "/api/customers" && method === "GET") {
    return response({ customers: await all(db, "SELECT * FROM customers ORDER BY id DESC") });
  }

  if (path === "/api/customers" && method === "POST") {
    const body = await readBody(request);
    if (!body) return response({ error: "A valid JSON body is required" }, 400);
    try {
      const name = requiredText(body.name, "name");
      const phone = body.phone == null ? null : String(body.phone).trim() || null;
      const email = body.email == null ? null : String(body.email).trim() || null;
      const result = await db.prepare(
        "INSERT INTO customers (name, phone, email, created_at) VALUES (?, ?, ?, datetime('now'))"
      ).bind(name, phone, email).run();
      return response({ customer: await first(db, "SELECT * FROM customers WHERE id = ?", result.meta.last_row_id) }, 201);
    } catch (error) {
      return response({ error: error.message }, 400);
    }
  }

  const customerMatch = path.match(/^\/api\/customers\/(\d+)$/);
  if (customerMatch) {
    const id = Number(customerMatch[1]);
    if (method === "GET") {
      const customer = await first(db, "SELECT * FROM customers WHERE id = ?", id);
      return customer ? response({ customer }) : response({ error: "Customer not found" }, 404);
    }
    if (method === "PUT" || method === "PATCH") {
      const body = await readBody(request);
      if (!body) return response({ error: "A valid JSON body is required" }, 400);
      const old = await first(db, "SELECT * FROM customers WHERE id = ?", id);
      if (!old) return response({ error: "Customer not found" }, 404);
      const name = body.name === undefined ? old.name : requiredText(body.name, "name");
      const phone = body.phone === undefined ? old.phone : (String(body.phone).trim() || null);
      const email = body.email === undefined ? old.email : (String(body.email).trim() || null);
      await db.prepare("UPDATE customers SET name = ?, phone = ?, email = ? WHERE id = ?")
        .bind(name, phone, email, id).run();
      return response({ customer: await first(db, "SELECT * FROM customers WHERE id = ?", id) });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();
      return response({ ok: true });
    }
    return response({ error: "Method not allowed" }, 405);
  }

  // SALES: body { customer_id?: number|null, items: [{ product_id, quantity }] }
  if (path === "/api/sales" && method === "GET") {
    const sales = await all(db,
      `SELECT s.*, c.name AS customer_name
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.id DESC`);
    return response({ sales });
  }

  if (path === "/api/sales" && method === "POST") {
    const body = await readBody(request);
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return response({ error: "Provide a JSON body with a non-empty items array" }, 400);
    }
    try {
      const customerId = body.customer_id == null ? null : Number(body.customer_id);
      if (customerId !== null && (!Number.isInteger(customerId) || customerId <= 0)) throw new Error("customer_id must be a positive integer");
      if (customerId !== null && !(await first(db, "SELECT id FROM customers WHERE id = ?", customerId))) throw new Error("Customer not found");
      const items = [];
      let total = 0;
      for (const item of body.items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity);
        if (!Number.isInteger(productId) || productId <= 0) throw new Error("Each product_id must be a positive integer");
        if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Each quantity must be a positive whole number");
        const product = await first(db, "SELECT id, name, price, stock FROM products WHERE id = ?", productId);
        if (!product) throw new Error(`Product ${productId} not found`);
        if (product.stock < quantity) throw new Error(`Insufficient stock for ${product.name}; available: ${product.stock}`);
        items.push({ product, quantity });
        total += Number(product.price) * quantity;
      }

      // D1 batch is transactional. Conditional stock updates prevent overselling.
      const saleInsert = db.prepare(
        "INSERT INTO sales (customer_id, total, created_at) VALUES (?, ?, datetime('now'))"
      ).bind(customerId, total);
      const saleResult = await saleInsert.run();
      const saleId = saleResult.meta.last_row_id;
      const statements = [];
      for (const item of items) {
        statements.push(db.prepare(
          "UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND stock >= ?"
        ).bind(item.quantity, item.product.id, item.quantity));
        statements.push(db.prepare(
          "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(saleId, item.product.id, item.product.name, item.quantity, item.product.price, item.quantity * Number(item.product.price)));
      }
      // A single batch groups the stock/item writes; verify stocks after pre-check.
      await db.batch(statements);
      return response({
        sale: await first(db, "SELECT * FROM sales WHERE id = ?", saleId),
        items: await all(db, "SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id", saleId),
      }, 201);
    } catch (error) {
      return response({ error: error.message }, 400);
    }
  }

  const saleItemsMatch = path.match(/^\/api\/sales\/(\d+)\/items$/);
  if (saleItemsMatch && method === "GET") {
    const saleId = Number(saleItemsMatch[1]);
    const sale = await first(db, "SELECT * FROM sales WHERE id = ?", saleId);
    if (!sale) return response({ error: "Sale not found" }, 404);
    return response({ sale_id: saleId, items: await all(db, "SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id", saleId) });
  }

  const saleMatch = path.match(/^\/api\/sales\/(\d+)$/);
  if (saleMatch && method === "GET") {
    const id = Number(saleMatch[1]);
    const sale = await first(db,
      `SELECT s.*, c.name AS customer_name FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`, id);
    if (!sale) return response({ error: "Sale not found" }, 404);
    return response({ sale, items: await all(db, "SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id", id) });
  }

  // DASHBOARD
  if (path === "/api/dashboard" && method === "GET") {
    const today = await first(db,
      `SELECT COUNT(*) AS sales_count, COALESCE(SUM(total), 0) AS sales_total
       FROM sales WHERE date(created_at) = date('now')`);
    const products = await first(db, "SELECT COUNT(*) AS product_count, COALESCE(SUM(stock), 0) AS units_in_stock FROM products");
    const customers = await first(db, "SELECT COUNT(*) AS customer_count FROM customers");
    const lowStock = await all(db, "SELECT * FROM products WHERE stock <= 5 ORDER BY stock ASC, name ASC");
    return response({ today, products, customers, low_stock: lowStock });
  }

  return response({ error: "Not found", path }, 404);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error("GODIA API error:", error);
      return response({ error: "Internal server error" }, 500);
    }
  },
};
