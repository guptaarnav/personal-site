package main

import (
	"log"
	"net/http"
)

func main() {
	fs := http.FileServer(http.Dir("./dist"))
	http.Handle("/", fs)

	log.Println("Serving on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
