import { query } from "./_generated/server";
import { v } from "convex/values";

// Return this weeks inspectipons, order by date (asc, des)
export const getThisWeekInspections = query({
    args: {},
    handler: async (ctx, args) => {
        const inspections = ctx.db
            .query("inspections");
        return inspections;    
    }
})
