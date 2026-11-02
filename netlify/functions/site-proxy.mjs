export default async (request, context) => {
  const origin = String(Netlify.env.get("AMANI_BACKEND_ORIGIN") || "").replace(/\/$/, "");
  if (!origin) return new Response(JSON.stringify({success:false,error:"Backend origin is not configured"}), {status:503,headers:{"content-type":"application/json"}});

  const url = new URL(request.url);
  const functionPrefix = "/.netlify/functions/site-proxy";
  const publicPrefix = "/api/site";

  let suffix = "";
  if (url.pathname.startsWith(functionPrefix)) {
    suffix = url.pathname.slice(functionPrefix.length);
  } else if (url.pathname.startsWith(publicPrefix)) {
    suffix = url.pathname.slice(publicPrefix.length);
  }

  const target = `${origin}/api/site${suffix}${url.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init = {method:request.method,headers,redirect:"manual"};
  if (!["GET","HEAD"].includes(request.method)) init.body = await request.arrayBuffer();

  const response = await fetch(target, init);
  const outHeaders = new Headers(response.headers);
  outHeaders.delete("content-encoding");

  return new Response(response.body,{status:response.status,headers:outHeaders});
};
