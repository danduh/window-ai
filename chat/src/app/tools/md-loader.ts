export const loadMDFile = async (fileName: string) => {
  return import(`../docs/${fileName}`)
    .then(res => {
      return res.default;
    })
    .catch(err => {
      console.log(err)
      return 'MD ERROR'
    });
}
