# Ruleta de la Liguilla (Netlify)

## Subir a Netlify (con la CLI)
1. `npm install`
2. `npx netlify-cli login`
3. `npx netlify-cli deploy --prod` (elige "Create & configure a new project" la primera vez)

También funciona subiéndolo a un repo de GitHub y conectándolo en Netlify.
El arrastrar-y-soltar (Netlify Drop) NO sirve: no instala la función.

## Clave para reiniciar el sorteo (opcional)
En Netlify: Project configuration → Environment variables → agrega `ADMIN_KEY` con la clave que quieras y vuelve a desplegar.
Para reiniciar abre `https://TU-SITIO.netlify.app/#admin`.
