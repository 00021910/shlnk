let slug ='', url = '', result = null;

async function postReqURL() {
    slug = document.getElementById("slug").value;
    url = document.getElementById("url").value;
    document.querySelector("#tips").innerHTML = "Fetching..."
    const response = await fetch("/url", {
        method: 'POST',
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            url: url,
            slug: slug
        })
    })
    result = await response.json();
    console.log(result)
    document.querySelector("#result").innerText = JSON.stringify(result);
    let tip = '';
    if (result.stack) tip = `<i>Oh, looks like an error occured. Try a different slug, or reload the page<i>`
    else tip = `<i>Tip:</i> You can get extra information (amount of requests/clicks, date created, etc.) about your link <a href="/api/stats/${result._id}">here</a>`
    document.querySelector("#tips").innerHTML = tip;
}

document.getElementById("submit").onclick = postReqURL;