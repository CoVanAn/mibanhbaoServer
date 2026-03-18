import dashboardService from "../../services/dashboard.service.js";

const handleError = (res, error) => {
  console.error(error);
  return res.status(500).json({
    success: false,
    message: "Server error",
    error: error.message,
  });
};

export async function getDashboardOverview(req, res) {
  try {
    const { year, quarter } = req.query;
    const data = await dashboardService.getOverview({ year, quarter });

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getDashboardDaily(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const data = await dashboardService.getDaily({ startDate, endDate });

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getDashboardTopProducts(req, res) {
  try {
    const { startDate, endDate, year, quarter, limit } = req.query;
    const data = await dashboardService.getTopProducts({
      startDate,
      endDate,
      year,
      quarter,
      limit,
    });

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getDashboardLowStock(req, res) {
  try {
    const { limit } = req.query;
    const data = await dashboardService.getLowStock({ limit });

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return handleError(res, error);
  }
}
