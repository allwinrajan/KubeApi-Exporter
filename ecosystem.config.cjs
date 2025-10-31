module.exports = {
  apps: [
    {
      name: "kubeapi",
      script: "index.js",
      env: {
        PORT: "8000",
        KUBECONFIG: "/etc/kubernetes/admin.conf"
      }
    }
  ]
};
