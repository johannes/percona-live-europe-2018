Äppelwoi
========

This is a demonstration of the MySQL DevAPI as used in a presentation at the Percona Live 2018 Europe
conference at Frankfurt, Germany.

Äpplewoi (Appl wine, cider) is a local spciality. This demo is an applicaton showing restaurants, bars
and pubs, which might serve Äppelwoi, on a map.

This software is "slideware" and archiectured in a way that indivdual parts and snippets can be shown 
on a slide and might not always use fully fletched architectures of a production-grade application.

Getting Started
---------------
The most simple way to get stated is by using Docker. This repositry contains a `docker-compose.yml` file,
which defines an MySQL Server 8.0 container and an Äppelwoi application container.

To build the container execute:

    npm run docker-build

After that you can bring the containers up:

    npm run docker-start

On first start we ned to initialize the database by loading the data from OpenStreetMap into the MySQL
Server. For this execute

    npm run docker-init

This will take a few seconds and print a copyright notice. For accessing the Äppelwoi application
you then can ope your browser on http://localhost:3000/

For running outside Docker you need a MySQL Server >= 8.0.13, provide your config in `config/`, 
install the dependencies via `npm install` and then import the OpenStreetMap data
using `npm run import` and then can start the serve via `npm start`.

License
-------
This code is provided for educational purpose to show examples of the MySQL X DevAPI. I is licensd under
GPL 2.0, Copyright by Johannes Schlüter.
