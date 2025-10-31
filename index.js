import express from "express";
import morgan from "morgan";
import {
  KubeConfig,
  CoreV1Api,
  AppsV1Api,
  NetworkingV1Api
} from "@kubernetes/client-node";

const PORT = process.env.PORT || 8000;

/** Load KubeConfig: try in-cluster first, fallback to default kubeconfig */
function getKubeClients() {
  const kc = new KubeConfig();
  try {
    kc.loadFromCluster();
  } catch (_) {
    kc.loadFromDefault();
  }
  return {
    core: kc.makeApiClient(CoreV1Api),
    apps: kc.makeApiClient(AppsV1Api),
    net: kc.makeApiClient(NetworkingV1Api)
  };
}

const { core, apps, net } = getKubeClients();
const app = express();
app.use(morgan("tiny"));

/** Extract common list params from query string */
function parseListParams(req) {
  const namespace = req.query.namespace || null;
  const labelSelector = req.query.labelSelector || undefined;
  const fieldSelector = req.query.fieldSelector || undefined;

  // K8s pagination
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const _continue = req.query.continue || undefined;

  // Resource version (advanced)
  const resourceVersion = req.query.resourceVersion || undefined;

  return { namespace, labelSelector, fieldSelector, limit, _continue, resourceVersion };
}

/** Unified responder with safe error structure */
function sendList(res, apiResp) {
  const body = apiResp.body || {};
  const items = body.items || [];
  res.json({
    count: items.length,
    continue: body.metadata?.continue || null,
    resourceVersion: body.metadata?.resourceVersion || null,
    items
  });
}

function sendError(res, err) {
  const status = err?.response?.statusCode || 500;
  const details = err?.response?.body || {
    message: err?.message || "Unknown error"
  };
  res.status(status).json({
    error: "K8S_API_ERROR",
    status,
    details
  });
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

/** ---- NAMESPACES ---- */
app.get("/api/namespaces", async (req, res) => {
  try {
    const params = parseListParams(req);
    const resp = await core.listNamespace(
      undefined,    // pretty
      undefined,    // allowWatchBookmarks
      params._continue,
      params.fieldSelector,
      params.labelSelector,
      params.limit,
      params.resourceVersion
    );
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- PODS ---- */
app.get("/api/pods", async (req, res) => {
  try {
    const p = parseListParams(req);
    const pretty = undefined, allowWatchBookmarks = undefined;
    let resp;
    if (p.namespace) {
      resp = await core.listNamespacedPod(
        p.namespace,
        pretty,
        allowWatchBookmarks,
        p._continue,
        p.fieldSelector,
        p.labelSelector,
        p.limit,
        p.resourceVersion
      );
    } else {
      resp = await core.listPodForAllNamespaces(
        pretty,
        allowWatchBookmarks,
        p._continue,
        p.fieldSelector,
        p.labelSelector,
        p.limit,
        p.resourceVersion
      );
    }
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- SERVICES ---- */
app.get("/api/services", async (req, res) => {
  try {
    const p = parseListParams(req);
    const pretty = undefined, allowWatchBookmarks = undefined;
    let resp;
    if (p.namespace) {
      resp = await core.listNamespacedService(
        p.namespace,
        pretty,
        allowWatchBookmarks,
        p._continue,
        p.fieldSelector,
        p.labelSelector,
        p.limit,
        p.resourceVersion
      );
    } else {
      resp = await core.listServiceForAllNamespaces(
        pretty,
        allowWatchBookmarks,
        p._continue,
        p.fieldSelector,
        p.labelSelector,
        p.limit,
        p.resourceVersion
      );
    }
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- NODES ---- */
app.get("/api/nodes", async (req, res) => {
  try {
    const p = parseListParams(req);
    const resp = await core.listNode(
      undefined,
      undefined,
      p._continue,
      p.fieldSelector,
      p.labelSelector,
      p.limit,
      p.resourceVersion
    );
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- DEPLOYMENTS ---- */
app.get("/api/deployments", async (req, res) => {
  try {
    const p = parseListParams(req);
    const pretty = undefined, allowWatchBookmarks = undefined;
    let resp;
    if (p.namespace) {
      resp = await apps.listNamespacedDeployment(
        p.namespace,
        pretty,
        allowWatchBookmarks,
        p._continue,
        p.fieldSelector,
        p.labelSelector,
        p.limit,
        p.resourceVersion
      );
    } else {
      resp = await apps.listDeploymentForAllNamespaces(
        pretty,
        allowWatchBookmarks,
        p._continue,
        p.fieldSelector,
        p.labelSelector,
        p.limit,
        p.resourceVersion
      );
    }
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- DAEMONSETS ---- */
app.get("/api/daemonsets", async (req, res) => {
  try {
    const p = parseListParams(req);
    let resp;
    if (p.namespace) {
      resp = await apps.listNamespacedDaemonSet(
        p.namespace, undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    } else {
      resp = await apps.listDaemonSetForAllNamespaces(
        undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    }
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- STATEFULSETS ---- */
app.get("/api/statefulsets", async (req, res) => {
  try {
    const p = parseListParams(req);
    let resp;
    if (p.namespace) {
      resp = await apps.listNamespacedStatefulSet(
        p.namespace, undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    } else {
      resp = await apps.listStatefulSetForAllNamespaces(
        undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    }
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- INGRESS ---- */
app.get("/api/ingresses", async (req, res) => {
  try {
    const p = parseListParams(req);
    let resp;
    if (p.namespace) {
      resp = await net.listNamespacedIngress(
        p.namespace, undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    } else {
      resp = await net.listIngressForAllNamespaces(
        undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    }
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

/** ---- EVENTS (handy for debugging) ---- */
app.get("/api/events", async (req, res) => {
  try {
    const p = parseListParams(req);
    let resp;
    if (p.namespace) {
      resp = await core.listNamespacedEvent(
        p.namespace, undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    } else {
      resp = await core.listEventForAllNamespaces(
        undefined, undefined, p._continue,
        p.fieldSelector, p.labelSelector, p.limit, p.resourceVersion
      );
    }
    sendList(res, resp);
  } catch (e) { sendError(res, e); }
});

app.listen(PORT, () => {
  console.log(`K8s Inventory API listening on http://0.0.0.0:${PORT}`);
});
