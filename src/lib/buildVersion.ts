const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_ID || "";

export const appendBuildVersion = (path: string) => {
  if (!BUILD_VERSION) return path;
  const [base, hash] = path.split("#");
  const separator = base.includes("?") ? "&" : "?";
  const versioned = `${base}${separator}v=${BUILD_VERSION}`;
  return hash ? `${versioned}#${hash}` : versioned;
};

export const maybeAppendBuildVersion = (path: string) => {
  if (!BUILD_VERSION) return path;
  if (path === "/dashboard" || path.startsWith("/experience")) {
    return appendBuildVersion(path);
  }
  return path;
};
