package main

import (
	"encoding/json"
	"fmt"
	"github.com/qedus/osmpbf"
	"io"
	"log"
	"os"
	"runtime"
)

func main() {

	const THRESHOLD = 50
	var osmKeys = []string{"amenity", "shop"}

	d := osmpbf.NewDecoder(os.Stdin)
	err := d.Start(runtime.GOMAXPROCS(-1))
	if err != nil {
		log.Fatal(err)
	}

	counts := make(map[string]int)

	for {
		if v, err := d.Decode(); err == io.EOF {
			break
		} else if err != nil {
			log.Fatal(err)
		} else {
			switch v := v.(type) {
			case *osmpbf.Node:
				if v.Tags["name"] == "" {
					break
				}
				for _, key := range osmKeys {
					tagValue, ok := v.Tags[key]
					if ok == true {
						fullName := fmt.Sprintf("%s/%s|%s", key, tagValue, string(v.Tags["name"]))
						counts[fullName]++
					}
				}
			case *osmpbf.Way:
				if v.Tags["name"] == "" {
					break
				}
				for _, key := range osmKeys {
					tagValue, ok := v.Tags[key]
					if ok == true {
						fullName := fmt.Sprintf("%s/%s|%s", key, tagValue, string(v.Tags["name"]))
						counts[fullName]++
					}
				}
			}
		}
	}

	for key, value := range counts {
		if value < THRESHOLD {
			delete(counts, key)
		}
	}

	b, err := json.Marshal(counts)
	if err != nil {
		fmt.Println("error:", err)
	}
	os.Stdout.Write(b)
}
