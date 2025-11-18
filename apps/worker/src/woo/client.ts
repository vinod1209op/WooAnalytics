import axios, { AxiosRequestConfig } from "axios";

export interface StoreConfig {
  id: string | number;
  wooBaseUrl: string | null;
  wooKey: string | null;
  wooSecret: string | null;
}

export class WooCommerceClient {
  private baseURL: string;
  private ck: string | null;
  private cs: string | null;
  private authMode: "qs" | "basic";

  constructor(store: StoreConfig) {
    this.baseURL = (store.wooBaseUrl || "").replace(/\/$/, "");
    this.ck = store.wooKey;
    this.cs = store.wooSecret;
    this.authMode = (process.env.WC_AUTH_MODE as "qs" | "basic") || "qs";
  }

  private paramsAuth(extra: Record<string, any> = {}) {
    if (!this.ck || !this.cs) return extra;

    return this.authMode === "qs"
      ? { consumer_key: this.ck, consumer_secret: this.cs, ...extra }
      : extra;
  }

  private basicAuth() {
    if (!this.ck || !this.cs) return undefined;

    return this.authMode === "basic"
      ? { username: this.ck, password: this.cs }
      : undefined;
  }

  private async requestWithRetry(
    config: AxiosRequestConfig,
    tries = 3
  ): Promise<any> {
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
      try {
        const res = await axios({ timeout: 60000, ...config });
        return res;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
    throw lastErr;
  }

  private async paginate(path: string, params: Record<string, any> = {}) {
    const all: any[] = [];
    let page = 1;
    const per_page = params.per_page ?? 50;

    while (true) {
      const res = await this.requestWithRetry({
        method: "GET",
        url: `${this.baseURL}/wp-json/${path}`,
        auth: this.basicAuth(),
        params: this.paramsAuth({ per_page, page, ...params }),
        headers: { "User-Agent": "WooAnalyticsWorker/1.0" },
      });

      const batch = Array.isArray(res.data) ? res.data : [];
      all.push(...batch);
      if (batch.length < per_page) break;
      page++;
    }

    return all;
  }

  private errMsg(error: any): string {
    const status = error?.response?.status;
    const data = error?.response?.data;
    if (status) {
      const brief =
        typeof data === "string"
          ? data.slice(0, 240)
          : JSON.stringify(data).slice(0, 240);
      return `HTTP ${status} ${brief}`;
    }
    return error?.message || "Unknown error";
  }

  async testConnection() {
    try {
      const res = await this.requestWithRetry({
        method: "GET",
        url: `${this.baseURL}/wp-json/wc/v3/system_status`,
        auth: this.basicAuth(),
        params: this.paramsAuth(),
      });
      return { success: true as const, data: res.data };
    } catch (error) {
      return { success: false as const, error: this.errMsg(error) };
    }
  }

  async getProducts(params: Record<string, any> = {}) {
    try {
      const data = await this.paginate("wc/v3/products", params);
      return { success: true as const, data };
    } catch (error) {
      return { success: false as const, error: this.errMsg(error) };
    }
  }

  async getOrders(params: Record<string, any> = {}) {
    try {
      const data = await this.paginate("wc/v3/orders", params);
      return { success: true as const, data };
    } catch (error) {
      return { success: false as const, error: this.errMsg(error) };
    }
  }

  async getCustomers(params: Record<string, any> = {}) {
    try {
      const data = await this.paginate("wc/v3/customers", params);
      return { success: true as const, data };
    } catch (error) {
      return { success: false as const, error: this.errMsg(error) };
    }
  }

  async getCoupons(params: Record<string, any> = {}) {
    try {
      const data = await this.paginate("wc/v3/coupons", params);
      return { success: true as const, data };
    } catch (error) {
      return { success: false as const, error: this.errMsg(error) };
    }
  }

  async getSubscriptions(params: Record<string, any> = {}) {
    try {
      const data = await this.paginate("wc/v1/subscriptions", params);
      return { success: true as const, data };
    } catch (error) {
      return { success: false as const, error: this.errMsg(error) };
    }
  }

  async getOrderRefunds(orderId: string | number) {
    try {
      const res = await this.requestWithRetry({
        method: "GET",
        url: `${this.baseURL}/wp-json/wc/v3/orders/${orderId}/refunds`,
        auth: this.basicAuth(),
        params: this.paramsAuth(),
      });
      return { success: true as const, data: res.data ?? [] };
    } catch (error) {
      return { success: false as const, error: this.errMsg(error) };
    }
  }
}
