import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an Indonesian Rupiah banknote detector. Analyze the image and identify all Indonesian Rupiah banknotes visible.

For each banknote detected, return:
- label: the denomination shorthand (1k, 2k, 5k, 10k, 20k, 50k, 100k)
- confidence: your confidence percentage (0-100)
- x: approximate horizontal position as percentage of image width (0-100)
- y: approximate vertical position as percentage of image height (0-100)  
- width: approximate width as percentage of image width
- height: approximate height as percentage of image height

Only detect these Indonesian Rupiah denominations:
- 1.000 (1k) - typically gold/yellow
- 2.000 (2k) - typically grey/silver
- 5.000 (5k) - typically brown/tan
- 10.000 (10k) - typically purple/violet
- 20.000 (20k) - typically green
- 50.000 (50k) - typically blue
- 100.000 (100k) - typically red/pink

If no banknotes are detected, return an empty array.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Detect all Indonesian Rupiah banknotes in this image. Return the results.",
                },
                {
                  type: "image_url",
                  image_url: { url: image },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_detections",
                description:
                  "Report all detected Indonesian Rupiah banknotes in the image",
                parameters: {
                  type: "object",
                  properties: {
                    detections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: {
                            type: "string",
                            enum: ["1k", "2k", "5k", "10k", "20k", "50k", "100k"],
                          },
                          confidence: { type: "number", minimum: 0, maximum: 100 },
                          x: { type: "number", minimum: 0, maximum: 100 },
                          y: { type: "number", minimum: 0, maximum: 100 },
                          width: { type: "number", minimum: 0, maximum: 100 },
                          height: { type: "number", minimum: 0, maximum: 100 },
                        },
                        required: ["label", "confidence", "x", "y", "width", "height"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["detections"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "report_detections" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Coba lagi nanti." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Kredit habis. Silakan tambah kredit." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI detection failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let detections: any[] = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        detections = parsed.detections || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(
      JSON.stringify({ detections }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("detect-currency error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
