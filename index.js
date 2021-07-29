const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const { nanoid } = require('nanoid');

require('dotenv').config();

const db = monk(process.env.MONGO_URI)
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

const app = express();

app.use(helmet());
app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());

app.use(express.static("./public"));

app.get('/api/stats/:_id', async (rq, rs) => {
    const { _id } = rq.params;
    try {
        const url = await urls.findOne({ _id });
        rs.set("Content-Type", "text/html")
        rs.write(`
            URL: <a href=${url.url}>${url.url}</a>,<br>
            Slug: <pre style="display: inline-block">${url.slug}</pre>,<br>
            Amount of requests: <i>${url.requests}</i>,<br>
            Date created: <i>${url.dateCreated.toString()}</i><br>
            <hr>
            <br>
            Can be accessed via this <a href="/${url.slug}">link</a>
            <br><br><br>
            <a href="/">Home Page</a>
        `);
    } catch (error) {
        console.warn(`Unexpected Error: `, error)
        rs.redirect(`/error/unknownerror`)
    }
})

app.get("/api/raw/:_id", async (rq, rs) => {
    const { _id } = rq.params;
    try {
        const url = await urls.findOne({ _id })
        rs.json(url)
    } catch (error) {
        rs.status(500)
        rs.send(error)
    }
})

app.get('/:slug', async (rq, rs) => {
    const { slug } = rq.params;
    try {
        const url = await urls.findOne({ slug });
        const r = url.requests;
        console.log(url, slug)
        if (url) {
            urls.update({"slug": url.slug}, {$set: {requests: r + 1}})
            rs.redirect(url.url)
        }
        rs.redirect(`/error/slugnotfound`)
    } catch (error) {
        rs.redirect(`/error/unknownerror`)
    }
})

app.get("/error/:err_name", (rq, rs) => {
    const { err_name } = rq.params;
    rs.set("Content-Type", "text/html")
    let rspage = ""
    switch (err_name) {
        case "slugnotfound":
            rspage = "<i>Slug you've requested has not been found! 🐌</i>"
            break
        case "unknownerror":
            rspage = "<b>Unknown error has accured! Please try reloading the page.</b>"
            break
        default:
            rspage = `<i>Wow, error 
            <pre style='display: inline-block; background: #ddd; padding: 4px; border-radius: 3px;'>${err_name}</pre> , 
            an error type unknown to the mankind</i> 😲 <i><sub>(at least to the dev)</sub></i>`
    }
    rs.send(rspage);
})

const scheme = yup.object().shape({
    slug: yup.string().trim().matches(/[\w\-]/i),
    url: yup.string().trim().url({}).required(),
})

app.post('/url', async (rq, rs, next) => {
    let { slug, url } = rq.body;
    try {
        await scheme.validate({
            slug,
            url,
        })
        if (!slug) slug = nanoid(6);
        else {
            const indb = await urls.findOne({slug});
            if (indb) throw new Error("Slug is already in use 🐌")
        }
        slug = slug.toLowerCase();
        let dateCreated = new Date();
        let requests = 0;
        const cluster = {
            url,
            slug,
            requests,
            dateCreated,
        }
    
        const created = await urls.insert(cluster);
    
        rs.json(created);
    } catch (error) {
        next(error);
    }
})

app.use((error, rq, rs, next) => {
    if (error.status) rs.status(error.status);
    else rs.status(500);

    rs.json({
        message: rq.message,
        stack: process.env.NODE_ENV === 'production' ? "🥞" : error.stack
    })

})

const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`Server listening at port ${port}`)
}) 