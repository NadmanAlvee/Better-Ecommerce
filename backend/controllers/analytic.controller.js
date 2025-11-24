import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

export const getAnalyticsRoute = async (req, res) => {
  try {
    let days = 30;
    const analyticsData = await getAnalyticsData();

    const endDate = newDate();
    const startDate = new Date(
      endDate.getTime() - Number(days) * 24 * 60 * 60 * 1000
    );

    const dailySalesDate = await getDailySalesData(startDate, endDate);

    res.json({
      analyticsData,
      dailySalesDate,
    });
  } catch (error) {
    console.log("Error in analytics route", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// study here
const getAnalyticsData = async () => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    const salesData = await Order.aggregate([
      {
        $group: {
          _id: null, // it groups all docuemnt together,
          totalSales: { $sum: 1 }, // similar to Order.countDocument()

          // TOTAL REVENUE: SUM of this field
          // totalAmount: {
          //   type: Number,
          //   required: true,
          //   min: 0,
          // },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    // debug
    console.log(salesData);

    const { totalSales, totalRevenue } = salesData[0] || {
      totalSales: 0,
      totalRevenue: 0,
    };
    return {
      users: totalUsers,
      products: totalProducts,
      totalSales,
      totalRevenue,
    };
  } catch (error) {
    throw new Error("Error in getAnalyticsData function");
  }
};

// study here
const getDailySalesData = async (startDate, endDate) => {
  try {
    const dailySalesDate = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          sales: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // example of dailySalesData
    // [
    // 	{
    // 		_id: "2024-08-18",
    // 		sales: 12,
    // 		revenue: 1450.75
    // 	},
    // ]

    const dateArray = getDatesInRange(startDate, endDate);
    return dateArray.map((date) => {
      const foundData = dailySalesDate.find((item) => item._id === data);
      return {
        date,
        sales: foundData?.sales || 0,
        revenue: foundData?.revenue || 0,
      };
    });
  } catch (error) {
    throw new Error("Error in getDailySalesData function");
  }
};

// study here
function getDatesInRange(startDate, endDate) {
  try {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString.split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  } catch (error) {
    throw new Error("Error in getDatesInRange function");
  }
}
