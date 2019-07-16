const fs = require('fs-extra');

const checkIfDistExists = async () => {
  const exist = await new Promise((resolve, reject) => {
    fs.exists('./dist', (exist) => resolve(exist));
  });

  if (exist) {
    return false;
  }

  return fs.mkdir('./dist');
};

const main = async () => {
  console.time('Build time');
  const pages = await fs.readdir('./pages').then(pages => pages.map(page => ({
    name: page.split('.')[0],
    ...require(`./pages/${page}`),
  })));

  const checkPageHasConfig = pages.filter(page => page.page);
  
  pages.filter(page => !page.page).forEach(({ name }) => console.log(`Page: [${name}.js] is missing required config properties`));

  const layouts = await fs.readdir('./layouts').then(layouts => layouts.map(layout => ({
    name: layout.split('.')[0],
    layout: require(`./layouts/${layout}`),
  })));

  const pagesAndLayouts = checkPageHasConfig.map(page => ({
    name: page.name,
    data: page.data,
    title: page.title,
    layout: layouts.find(layout => layout.name === page.layout).layout,
    page: page.page,
  }));

  const generateHtml = pagesAndLayouts.map(async ({ name, layout, page, data, title }) => ({
    html: layout({ content: typeof data === 'function' ? page(await data()) : page(data), title }),
    name: name,
  }));

  const resolveData = await Promise.all(generateHtml);

  await checkIfDistExists();

  await Promise.all(resolveData.map(({ name, html }) => fs.writeFile(`./dist/${name}.html`, html)));

  console.log('\nBuild complete!\n');
  console.timeEnd('Build time');
}

const checkIfPagesExist = async () => {
  const distPages = await fs.readdir('./dist').then(pages => pages.filter(page => page.includes('.html')).map(page => ({
    name: page.split('.')[0],
    path: `./dist/${page}`
  })));

  const pagesToDelete = distPages.filter(page => {
    return !fs.existsSync(`./pages/${page.name}.js`);
  });

  await Promise.all(pagesToDelete.map(page => fs.unlink(page.path)));
};

main().then(() => checkIfPagesExist());