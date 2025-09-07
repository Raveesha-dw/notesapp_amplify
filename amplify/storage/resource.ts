import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({ 
    name: "amplifyNotesDrive",  
    access: (allow) => ({    
        "media/*": [      
            allow.entity("identity").to(["read", "write", "delete"]),    
        ],  
    }),
});