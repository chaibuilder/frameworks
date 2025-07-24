export const FontsAndStyles = async () => {
  const fontUrls: string[] = [];
  const themeCssVariables = "";
  const customFontFace = "";
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {fontUrls.map((fontUrl: string) => (
        <link
          key={fontUrl}
          rel="preload"
          href={fontUrl}
          as="style"
          crossOrigin=""
        />
      ))}

      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      <style
        id="theme-colors"
        dangerouslySetInnerHTML={{ __html: themeCssVariables }}
      />
      {fontUrls.map((fontUrl: string) => (
        <link key={fontUrl} rel="stylesheet" href={fontUrl} />
      ))}
      <style
        id="custom-font-face"
        dangerouslySetInnerHTML={{ __html: customFontFace }}
      />
    </>
  );
};
