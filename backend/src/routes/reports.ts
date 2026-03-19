import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listLowStock, listProducts, listSales } from '../memoryStore.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get('/overview', (req, res) => {
  const tenantId = req.authUser!.tenantId;
  const sales = listSales(tenantId);
  const products = listProducts(tenantId);

  const today = new Date().toISOString().slice(0, 10);
  const todaysSales = sales.filter((s) => s.createdAt.startsWith(today));

  const dailySummary = todaysSales.reduce(
    (acc, s) => {
      acc.totalGross += s.total;
      acc.totalNet += s.netTotal;
      acc.totalTax += s.taxTotal;
      acc.count += 1;
      return acc;
    },
    { totalGross: 0, totalNet: 0, totalTax: 0, count: 0 },
  );

  const productTotals = new Map<string, { count: number; revenue: number }>();
  for (const sale of todaysSales) {
    for (const item of sale.items) {
      const agg = productTotals.get(item.productId) ?? { count: 0, revenue: 0 };
      agg.count += item.quantity;
      agg.revenue += item.lineTotal;
      productTotals.set(item.productId, agg);
    }
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const topProducts = Array.from(productTotals.entries())
    .map(([productId, agg]) => ({
      productId,
      name: productById.get(productId)?.name ?? 'Unknown',
      quantity: agg.count,
      revenue: agg.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStock = listLowStock(tenantId).slice(0, 10).map((lvl) => {
    const product = productById.get(lvl.productId);
    return {
      productId: lvl.productId,
      name: product?.name ?? 'Unknown',
      quantity: lvl.quantity,
      minQuantity: lvl.minQuantity,
    };
  });

  res.json({
    date: today,
    dailySummary,
    topProducts,
    lowStock,
  });
});

